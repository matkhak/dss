function getResponsibleService() {

	var query =	"SELECT 0,'  ','  ' FROM dummy UNION " +
	    "	SELECT  ZSUIT_OWNERS__ID, ZSUIT_OWNERS__NAME,ZSUIT_OWNERS__CODE_VALUE  FROM \"_SYS_BIC\".\"bobj_repo.views/CV_SP_ZSUIT_OWNERS\" order by 2";

	var conn = $.db.getConnection();
	var pstmt = conn.prepareStatement(query);
	var rs = pstmt.executeQuery();
	var data = [];

	while (rs.next()) {
		data.push({
			"ID" : rs.getNString(1),
			"NAME" : rs.getNString(2),
			"DESCR" : rs.getNString(3)
		});
	}

	$.response.setBody(JSON.stringify(data));
	$.response.contentType = 'application/json';
	$.response.status = $.net.http.OK;
	conn.commit();
	conn.close();

}
getResponsibleService();
