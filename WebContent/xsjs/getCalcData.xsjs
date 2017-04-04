/**
 * ********************************************
 * Возвращает полную инфу о варианте расчета
 * ********************************************
 *
 * @param GET запрос Принимает параметры: id - id карточки version - версия
 *
 * @return В случае успеха возвращается статус 200
 *
 * @author Domozhakov_MV@surgutneftegas.ru
 * @author Talipov_MI@surgutneftegas.ru
 */


var conn = $.db.getConnection();
try {
    getCardData();
} catch (e) {
    $.response.setBody(e.toString());
    $.response.status = $.net.http.INTERNAL_SERVER_ERROR;
}


function getCardData()
{
    let iId = parseInt($.request.parameters.get("id"));
    let iVersion = parseInt($.request.parameters.get("version"));

    let pstmt = conn.prepareStatement(
        "SELECT c.ID_CARD, c.VERSION_CARD, c.IND, c.NAME_CALC, c.DESCRIPTION, PLAN_FACT, c.RESPONSIBLE_SERVICE_ID, c.RESPONSIBLE_PERSON_LOGIN, " +
        "a.id_attribute, a.function, (p.ADRP__NAME_LAST || ' ' || p.ADRP__NAME_FIRST), ind.fname, " +
        "c.ACTIVE_FROM, c.ACTIVE_TO, u.AUTHOR, u.CREATION_DATE, " +
        "i.code_value, c.DIGIT, ind.UNIT_NAME " +
        "FROM Z_BOBJ_REPO.T_CALC as c " +
        // "left outer join
        // \"_SYS_BIC\".\"bobj_repo.views/CV_SP_RESPONSIBLE_SERVICE\" as s "+
        // "on c.RESPONSIBLE_SERVICE_ID = s.domvalue_int " +
        
        "left outer join \"_SYS_BIC\".\"sngias.spravochniki.mm/CV_SP_USERS\" as p "+
        "   on c.RESPONSIBLE_PERSON_LOGIN = p.usr21__Bname " +
        "left outer join \"_SYS_BIC\".\"bobj_repo.views/CV_SP_INDICATORS\" as ind "+
        "   on c.IND = ind.indcd " +
        "left outer join Z_BOBJ_REPO.T_CALC_ATTRIBUTE as a "+
        "   on c.id_calc = a.id_calc and a.function is not null " +
        "left outer join \"_SYS_BIC\".\"bobj_repo.views/CV_UNAPPROVED_OBJECTS\" as u " +
        "   on u.ID = C.ID_CALC and u.VERSION = c.version_calc " +
        "left outer join Z_BOBJ_REPO.T_CARD as card " +
        "   on card.id_card = c.id_card " +
        "   and card.version = c.version_card " +
        "left outer join Z_BOBJ_REPO.T_IAS as i " +
        "   on card.ias_id = i.id_ias " +
        "WHERE c.ID_CALC = ? " +
        "AND c.VERSION_CALC = ? " +
        "AND i.is_active = true"
        // чтобы вызывать любые варианты расчета, убрал эту запись

        // +"and c.is_active = false "
    );
    pstmt.setBigInt(1, iId);
    pstmt.setInteger(2, iVersion);
    let rs = pstmt.executeQuery();
    rs.next();

    let data = {
        card: {
            id: rs.getInteger(1),
            version: rs.getInteger(2),
            iasCodeValue: rs.getNString(17)
        },
        calc: {
            id: iId,
            version: iVersion,
            ind: rs.getNString(3),
            name: rs.getNString(4),
            desc: rs.getNString(5),
            planFact: rs.getInteger(6),
            respService: rs.getInteger(7),
            respPersonLogin: rs.getNString(8),
            measure: rs.getInteger(9),
            function: rs.getNString(10),
            respPersonName: rs.getNString(11),
            indFullName: rs.getNString(12),
            activeFrom: rs.getNString(13),
            activeTo: rs.getNString(14),
            editAuthor: rs.getNString(15),
            editDate: rs.getNString(16), // .substr(0, 19), // тупо, но быстро
            digit: rs.getInteger(18),
            unit: rs.getNString(19) 


        },
        analytics: getAnalytics(iId, iVersion),
        filters: getFilters(iId, iVersion)
    };

    $.response.setBody(JSON.stringify(data));
    $.response.contentType = 'application/json';
    $.response.status = $.net.http.OK;
}


function getAnalytics(iId, iVersion)
{
    let pstmt = conn.prepareStatement(
        "SELECT ID_ATTRIBUTE, DESCRIPTION " +
        "FROM \"Z_BOBJ_REPO\".\"T_CALC_ATTRIBUTE\" " +
        "WHERE ID_CALC = ? " +
        "AND VERSION_CALC = ? " +
        "AND function is null"
    );
    pstmt.setBigInt(1, iId);
    pstmt.setInteger(2, iVersion);
    let rs = pstmt.executeQuery();
    let data = [];

    while (rs.next()) {
        var tst = {
            attrId: rs.getInteger(1),
            // function: rs.getNString(2),
            desc: rs.getNString(2)
        };
        data.push(tst);
    }
    return data;
}

function getFilters(iId, iVersion)
{
    let pstmt = conn.prepareStatement(
        "SELECT ID_ATTRIBUTE, OPERATION, VALUE " +
        "FROM\"Z_BOBJ_REPO\".\"T_CALC_FILTER\" " +
        "WHERE ID_CALC = ? " +
        "AND VERSION_CALC = ? "
    );
    pstmt.setBigInt(1, iId);
    pstmt.setInteger(2, iVersion);
    let rs = pstmt.executeQuery();
    let data = [];

    while (rs.next()) {
        let idWasFound = false;
        for (let item of data) {
            if (item.attrId === rs.getInteger(1)) {
                item.operations.push({
                    operation: rs.getNString(2),
                    value: rs.getNString(3)
                });
                idWasFound = true;
                break;
            }
        }

        if (!idWasFound) {
            data.push({
                attrId: rs.getInteger(1),
                operations: [{
                    operation: rs.getNString(2),
                    value: rs.getNString(3)
                }]
            });
        }
    }
    return data;
}
