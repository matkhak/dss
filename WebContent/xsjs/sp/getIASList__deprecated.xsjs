/**
 ******************************************************
 *        Возвращает список всех ИАС           *
 ******************************************************
 *
 * @param Только GET запрос, без параметров
 *
 * @return В случае успеха возвращается массив объектов вида:
    {
        "code": "X",
        "name": "Y"
    }
 *
 * @author Talipov_MI@surgutneftegas.ru
 *
 */


// есть похожий сервис в common_xsjs/getListInfoModels зачем дублировать?

// if ($.request.method === $.net.http.GET) {
//     var conn = $.db.getConnection();
//
//     var ps = conn.prepareStatement(
//         "SELECT ID_IAS, CODE_VALUE, VERSION, NAME, DESCRIPTION " +
//         "FROM Z_BOBJ_REPO.T_IAS " +
//         "WHERE IS_ACTIVE = true "
//     );
//     var result = ps.executeQuery();
//
//     var out = [];
//     while (result.next()) {
//         out.push({
//             "code": result.getInteger(1),
//             "codeValue": result.getNString(2),
//             "version": result.getNString(3),
//             "name": result.getNString(4),
//             "descr": result.getNString(5)
//         });
//     }
//
//     $.response.setBody(JSON.stringify(out));
//     $.response.status = $.net.http.OK;
//     $.response.contentType = 'application/json';
// }
